/* ----------------------------------------------------------------------------
                GitHup Ctrl
---------------------------------------------------------------------------- */

//Initialisation
var app = angular.module("AdobeOpenSource", ["ngResource"]);


/* ----------------------------------------------------------------------------
                Filters */
app.filter('star', function() {
	return function(infos) {
        switch(infos.id)
        {
        case 0:
          state = (infos.value > 5) ? "on" : "off";
          break;
        case 1:
          state = (infos.value > 30) ? "on" : "off";
          break;
        case 2:
          state = (infos.value > 100) ? "on" : "off";
          break;
        case 3:
          state = (infos.value > 500) ? "on" : "off";
          break;
        case 4:
          state = (infos.value > 1000) ? "on" : "off";
          break;
        default:
          state = "off";
        }
		return state;
    };
});

app.filter('projectsFilter', function() {
    return function(projects, scope) {
        projects = scope.filter('filter')(scope.projects, scope.searchName);
        var newProject = new Array();
        
        if (scope.searchLang || scope.searchOrg || scope.filterStarIndex != 0) {
            for (var i = 0; i < projects.length; i++) {
               var actProj = projects[i];
                
                switch(scope.filterStarIndex)
                {
                case 1:
                    filterStarBool = (actProj.watchers_count > 5) ? true : false;
                    break;
                case 2:
                    filterStarBool = (actProj.watchers_count > 30) ? true : false;
                    break;
                case 3:
                    filterStarBool = (actProj.watchers_count > 100) ? true : false;
                    break;
                case 4:
                    filterStarBool = (actProj.watchers_count > 300) ? true : false;
                    break;
                case 5:
                    filterStarBool = (actProj.watchers_count > 1000) ? true : false;
                    break;
                default:
                    filterStarBool = true;
                    break;
                }
                
                
                var resLang = new Array();
                for (var j = 0; (j < scope.searchLang.length && resLang.length == 0); j++) {
                    resLang = scope.filter('filter')(actProj.languages, scope.searchLang[j]);
                }
                var resOrg = -2; //init value
                for (var k = 0; (k < scope.searchOrg.length && resOrg < 0); k++) {
                    var regOrg = new RegExp(scope.searchOrg[k], "i");
                    resOrg = actProj.org.search(regOrg);
                }
                
                if ((resLang.length || scope.searchLang.length == 0)
                && (resOrg != -1 || !scope.searchOrg)
                && filterStarBool) {
                    newProject.push(actProj);
                }
            }
        } else {
            newProject = projects;
        }
        newProject = scope.filter('orderBy')(newProject,(scope.filterOrder) ? scope.filterOrder : "-watchers_count");
			
			return newProject.slice(0, scope.projLast);
    };
});

app.filter('link', function() {
	return function(project) {
        return (project.homepage == "" || project.homepage == null) ? project.html_url : project.homepage;
    };
});

app.filter('niceNum', function() {
	return function (num) {
		var niceNum = "";
		var step = 1;
        
		while ( num > 1 ) {
			rest = num % 1000;
			
			//Put it in a nice string
			if ( num > 1000 ) {
				if ( rest < 10 ) {
					rest = "00" + rest;
                }
				else if ( rest < 100 ) {
					rest = "0" + rest;
                };
            };

			niceNum =  rest + "'" + niceNum;
			num = Math.floor(num / 1000);
    }
        
		return (niceNum == "") ? "0" : niceNum.substring(0, niceNum.length-1);
    }
});

app.filter('shortenStr', function() {
	return function (string) {
        maxChar = 120;
		return (string.length > maxChar ) ?  string.substring(0, maxChar)+"..." : string;
    }
});

app.filter('timeDiff', function() {
	return function (timeRaw) {
    var now = new Date();
    var time = new Date( timeRaw );
		var diff = now - time;
		
		var days = Math.floor(diff / 1000 / 60 / (60 * 24));

    var date_diff = new Date( diff );
		
		var sDate = "";
    if (days != 0) {
			//Count and display nb years
			var years = Math.floor( days / 365 );
			if (years != 0) {
				sDate += years + " year";
				sDate += (years > 1) ? "s " : " ";
				//Reduce it to the number of days not counted
				days = days % 365;
			}
			
			var months = Math.floor( days / 30 );
			if (months != 0 ) {
				sDate += months + " month";
				sDate += (months > 1) ? "s " : " ";
			}
			else if (years == 0) {
				sDate += days + " d "+ date_diff.getHours() + " h";
			}
		}
		else {
			sDate += date_diff.getHours() + " h " + date_diff.getMinutes() + " min";
		}
		
		return sDate;
  }
});

/* ----------------------------------------------------------------------------
                Main Controller */

//Get Adobe Github repos & orgs
//app.factory("ReposAdobe", function($resource) {
//    return $resource("http://localhost:8000", {'8000': ':8000'});
//});
app.factory("ReposAdobe", function($resource) {
    return $resource("offline/server.json");
});

//Get Feaatured for the header
app.factory("FeaturedHeader", function($resource) {
    return $resource("offline/featured.json")
});

//TODO : Manage offline project list when errors
this.GitHubCtrl = function($scope, $filter, ReposAdobe, FeaturedHeader) {
    
    //------------------------------- Init --------------------------------
    
	//Be able to call math functions
	$scope.Math = Math;
	$scope.Object = Object;
	$scope.filter = $filter;
	$scope.filterStarIndex = 0;
	$scope.indexFeatured = {
		"org": 0,
		"projects": 0
	};
	$scope.searchLang = new Array();
	$scope.searchOrg = new Array();
	
	//Init display range
	$scope.projFirst = 0;
	$scope.projLast = 10;
	
	//Loading active
	$scope.loading = true;
    
    
    //------------------------------- Featured header --------------------------------
    
    // hFeatured on the header
    $scope.featureds = FeaturedHeader.query( function() {
		$scope.featureds = $scope.featureds[0];
		var keys = Object.keys($scope.featureds);
        for (var i = 0; i < keys.length; i++) {
			var actFeatured = $scope.featureds[keys[i]];
			for (var j = 0; j < actFeatured.length; j++) {
				var actFeaturedItem = actFeatured[j];
				
				actFeaturedItem.textHeader = actFeaturedItem.textHeader.join("\n");
			};
		};
    });
    
    $scope.changeIndexFeatured = function(i, delta) {
        if ($scope.indexFeatured[i] <= 0 && delta < 0) {
            $scope.indexFeatured[i] = $scope.featureds[i].length - 1;
        } else if ($scope.indexFeatured[i] >= $scope.featureds[i].length-1 && delta > 0) {
            $scope.indexFeatured[i] = 0;
        } else {
            $scope.indexFeatured[i] += delta;
        }
    }
    
    $scope.setIndexFeatured = function(i, index) {
        $scope.indexFeatured[i] = index;
    }
    
    //------------------------------- Datas --------------------------------
	
	$scope.projects = [];
	$scope.orgs = [];
	
	//Reference Orgs
	ReposAdobe.query(function(rep) { 
		console.log(rep);
		if (rep[0]) {
			$scope.projects = rep[0].repos;
			$scope.orgs = rep[0].orgs;
//			$scope.langs = rep[0].langs;
		}
		
		//Loading over
		$scope.loading = false;
		console.info($scope.projects);
	});
	
	$scope.showHideProj = function() {
		if ($scope.projLast == 10) {
			$scope.projLast = 100;
		}
		else {
			$("html, body").animate({ scrollTop: 380 }, 100);
			$scope.projLast = 10;
		}
	}
    
    //------------------------------- Filters --------------------------------
    
    $scope.majDisplayStar = function(index) { $scope.displayStarIndex = index; }
    $scope.majFilterStar = function(index) { $scope.filterStarIndex = index; }
    
    $scope.addFilter = function(filter, item) {
        var present = false;
        
        for (var i=0; i < filter.length; i++) {
            if (filter[i].name == item.name) {
                present = true;
            }
        }
        
        if (!present) {
            filter.push(item.name);
        }
        
        $scope.searchLangInput = "";
        $scope.searchOrgInput = "";
    }
    
    $scope.deleteFilter = function(array, i) {
        array.splice(i, 1);
    }
    
    //--------------------------- Mobile & Parrallax -----------------------------
	
	$scope.mobile = isMobile(navigator.userAgent||navigator.vendor||window.opera);
	$scope.menuOpen = false;
	
	if ($scope.mobile) {
		$(window).off("scroll", scrollUpdate);
	} else {
		$(window).on("scroll", scrollUpdate);
	}
	
	$(document).foundation();
	
	$scope.expandMenu = function() {
		$scope.menuOpen = !$scope.menuOpen;
	}
};


/* ----------------------------------------------------------------------------
                Mobile Detection
---------------------------------------------------------------------------- */

var isMobile = function(a) {
	var test1 = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a);
	var test2 = /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4));
	if(test1 || test2) {
		return true;
	} else {
		return false;
	}
};


/* ----------------------------------------------------------------------------
                Parrallax Scrolling
---------------------------------------------------------------------------- */

var scrollUpdate = function () {
	var scrollTop = $(window).scrollTop();
		
	// ----------------------------------------------------------------------------
	//					First parallax: header
	if (scrollTop < ($("#featuredProj").height() + 20) ) {
		var topLogo_header = ( $(window).scrollTop()/3 ) - 70;
		$("#featuredProj .logo").css({ top: topLogo_header });
		$("#featuredProj .text-header").css({ bottom: 0 + scrollTop });
	}
	
	// ----------------------------------------------------------------------------
	//					2nd parrallax: organisations
	var topLogo_org = ( ( $(window).scrollTop() - $("#featuredOrg").position().top + 350 ) / 2 ) - 10 ;
	if ( topLogo_org > 90 )
		topLogo_org = 90;
	$("#featuredOrg .logo").css({ top: topLogo_org });
	
	// ----------------------------------------------------------------------------
	//					3rd parrallax: footer
	var topLogo_footer = ( scrollTop + $(window).height() - $("#footer").position().top - $("#footer").height()*2 ) - 115;
	$("#logo3").css({ bottom: topLogo_footer });
}